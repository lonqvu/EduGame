package com.edugame.game.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.edugame.game.domain.Game;
import com.edugame.game.domain.GameVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GameVersionRepository extends JpaRepository<GameVersion, Long> {

    /** The version being edited: the DRAFT if there is one (always the newest), else the last published. */
    Optional<GameVersion> findFirstByGameOrderByVersionDesc(Game game);

    @Query("""
            select v.game.id as gameId, count(i.id) as itemCount
            from GameVersion v
            left join GameItem i on i.gameVersion = v
            where v.game.id in :gameIds
              and v.version = (select max(v2.version) from GameVersion v2 where v2.game = v.game)
            group by v.game.id
            """)
    List<GameItemCount> countItemsOfLatestVersions(Collection<Long> gameIds);

    interface GameItemCount {

        Long getGameId();

        long getItemCount();
    }
}
